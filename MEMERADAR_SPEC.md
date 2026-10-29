# MemeRadar — Build Spec for Claude Code

> Place this file in the repo root. Claude Code: read this whole file before writing any code,
> then follow "Build order" at the end, one step at a time.

## 1. What we are building

A personal Solana meme-coin **signal + journal** platform.

- Watches **every new token launch** on Solana, tracks its early trading, filters it through
  staged rules, and scores it.
- Shows suggested tokens on a **trading-terminal dashboard** with full **contract details**
  (one-click copy of the contract address).
- Sends **email alerts** (Resend) and a **daily digest**.
- Keeps a **day-wise history of every suggested coin** with outcomes, and a **trade journal**
  where the user logs trades they executed manually on **Axiom**.

**It never executes trades and holds no private keys.** Never call or scrape any Axiom
endpoint — only link to `https://axiom.trade/meme/<mint>` (make the URL pattern configurable).

Single user (personal, non-commercial), but built with proper auth and RLS.

## 2. Stack and environment

The user already has **Supabase, Vercel and Resend** accounts. The worker runs on the
**user's own PC** (Windows/macOS) via Docker Desktop.

- **Monorepo:** pnpm + Turborepo
  - `apps/worker` — Node 20 + TypeScript, long-running ingestion + scoring
  - `apps/web` — Next.js (App Router) + Tailwind + shadcn/ui, deployed on Vercel
  - `packages/core` — shared types, rules engine, providers
  - `packages/db` — Supabase migrations, generated types
  - `packages/emails` — React Email templates
- **Database/Auth:** Supabase Postgres + Supabase Auth (email + password), RLS on every table
- **Hot state:** Redis (in docker-compose with the worker)
- **Email:** Resend + React Email
- **Charts:** TradingView Lightweight Charts (open source — include its required attribution)
- **Tests:** Vitest. Every rule, safety check and outcome calculation needs unit tests with fixtures.
- **Time:** store UTC; display and group by day in the user's timezone (default `Asia/Dubai`).

### docker-compose (local PC)
- Services: `worker`, `redis`. Both `restart: always`.
- Worker exposes `GET /health` on localhost (status, stream lag, last event time, credits used).
- `.env.example` documents every variable; secrets only in env, never committed.

## 3. Data providers (behind interfaces in `packages/core/providers`)

| Provider | Role | Plan now → later |
|---|---|---|
| **PumpPortal** `wss://pumpportal.fun/api/data` | Live feed: new tokens, trades, migrations (Pump.fun) | Free |
| **Helius** | RPC lookups for shortlisted tokens (mint/freeze authority, largest holders, metadata). Later: `transactionSubscribe` for other launchpads | Free → Developer ($49) |
| **Birdeye** `public-api.birdeye.so` | `token_security`, `token_overview`, `trade-data/single` for top candidates only | Standard (free) → Lite ($39) |

Interfaces:
- `LaunchFeed` — `onNewToken`, `onTrade`, `onMigration`, `watch(mints)`, `unwatch(mints)`, `watchWallets(addresses)`
  - `PumpPortalFeed` (Phase 1)
  - `HeliusWssFeed` (Phase 2: `transactionSubscribe` on Pump.fun, PumpSwap, Bonk/LetsBonk,
    Raydium LaunchLab, Meteora DBC program IDs; decode create + swap instructions)
  - Dedupe on transaction signature when both run.
- `RpcProvider` — `getMintInfo`, `getLargestHolders`, `getAsset` (Helius impl)
- `EnrichmentProvider` — `getSecurity`, `getOverview`, `getTradeData` (Birdeye impl)

### PumpPortal rules
- Use **one** WebSocket connection; add/remove subscriptions on it (`subscribeNewToken`,
  `subscribeTokenTrade` with mint keys, `subscribeAccountTrade` for tracked wallets,
  `subscribeMigration`, and the matching unsubscribe methods — verify exact method names
  against PumpPortal docs before coding).
- Auto-reconnect with exponential backoff; on reconnect re-send all subscriptions; record
  every gap (start, end) in `feed_gaps`.

### Provider modes (`PROVIDER_MODE` env)
- `free` — PumpPortal + Helius Free (queue, max 8 req/s) + Birdeye Standard (max 1 req/s,
  max 12 Gate-3 checks/day; after that skip Gate 3 and mark the signal
  "Birdeye skipped – free tier").
- `live` — paid keys; limits from env (Helius Developer ≤ 40 req/s, Birdeye Lite ≤ 12 req/s).
- `replay` — replay `/fixtures/*.jsonl` at 1x–20x speed; Helius and Birdeye replaced by mocks
  that return recorded responses. Uses zero API credits.
- **Recorder:** in `free`/`live`, append the raw PumpPortal stream and every Helius/Birdeye
  response to `/fixtures/YYYY-MM-DD.jsonl` (rotate daily, keep 14 days).
- Switching to paid = new API keys + `PROVIDER_MODE=live`. No code changes.

### Budget guards
- Track Helius credits and Birdeye CUs used per day (Birdeye: poll `/utils/v1/credits` hourly).
- Show usage vs. plan limits on the Settings page; email the user at 70% and 90% of monthly limits.
- Cache Birdeye `token_overview` 60s and `token_security` 10 min per token.
- **Never** call Helius or Birdeye for a token that failed an earlier gate.
- Outcome tracking uses our own trade prices, never Birdeye.

## 4. Pipeline

```
New token (PumpPortal)
 → insert into tokens, add to watch set, subscribe to its trades
 → every 15s per watched token: update metrics from our own trades (Redis rolling windows)
 → Gate 1 (trade data only, free)
 → Gate 2 (Helius RPC)
 → Gate 3 (Birdeye)
 → score → signal → dashboard (realtime) + email + day-wise history
 → stop watching after 30 min with no trades, or 24h without a signal
```

### Metrics per watched token (Redis, windows 1m / 5m / 15m)
unique buyers, unique sellers, buy count, sell count, buy/sell ratio, volume (SOL + USD),
volume acceleration (5m vs previous 15m), market cap, bonding-curve progress %, dev wallet
net flow, estimated top-10 holder % (from trades), number of tracked (Top-100) wallets that
bought, age.

### Gate 1 — trade data (all thresholds from the `rules` table)
- age between `age_min` and `age_max` (default 2 min – 24 h)
- market cap between `mc_min` and `mc_max` (default $30K – $1.5M)
- unique buyers 5m ≥ `buyers_5m_min` (default 40)
- buy/sell ratio 5m ≥ `bs_ratio_min` (default 1.5)
- dev wallet has not sold more than `dev_sell_max_pct` (default 50%) of its initial buy
- not a name/ticker clone of a recent top token (fuzzy match against a cached list)

### Gate 2 — Helius RPC
- mint authority revoked
- freeze authority revoked
- top-10 holders < `top10_max_pct` (default 30%), excluding the bonding curve / pool account
- dev wallet current holding < `dev_hold_max_pct` (default 5%)

### Gate 3 — Birdeye
- `token_security` has no critical flags (as configured in `rules`)
- liquidity ≥ `liq_min` once migrated (default $15K)

### Score (0–100, weights from the `rules` JSON, versioned)
buyers momentum, buy/sell ratio, volume acceleration, smart-wallet buys (rank-weighted),
holder distribution, bonding-curve progress, liquidity. Emit a signal if score ≥
`signal_threshold` (default 65). Per-token cooldown 30 min unless the score rises ≥ 15.
Store the full feature vector, rule version and a contract snapshot with every signal.

### Funnel stats
Count tokens seen / passed Gate 1 / Gate 2 / Gate 3 / signaled per day; show as a funnel on
the dashboard.

## 5. Smart wallets (scoring factor, not the entry trigger)
- **Seed list:** the user can paste wallet addresses they follow on Axiom (Wallets page).
- **Leaderboard:** nightly job computes per wallet, from our stored trades: realized PnL,
  win rate, closed trades, median ROI, average hold time. Start ranking only after 7 days of
  data; use a 30-day window once available.
- **Eligibility:** ≥ 20 closed trades, ≥ 40% win rate, positive PnL.
- **Exclude:** buys in the creation slot, wallets funded by the deployer, bundles (same funder
  + same slot), bots (> 200 trades/day or median hold < 30s).
- **Rank:** PnL 40 / win rate 30 / median ROI 20 / consistency 10 → Top 100.
- Track Top 100 + seed list via `subscribeAccountTrade`; their buys feed the score.
- Allow/deny list editable in the UI.

## 6. Contract details (per token; shown everywhere a token appears)
mint address (CA), name, ticker, image, decimals, total supply, token program (SPL /
Token-2022 + extensions), mint authority, freeze authority, creator/dev wallet + current
holding %, created at, launchpad, bonding curve address + progress, migrated (yes/no) +
pool address + DEX, LP status, top-10 holder %, socials from metadata.
UI: **Copy CA** button (toast on copy), links to Axiom, Solscan, DexScreener.

## 7. Outcome tracking
For every signal record price + market cap at +5m, +15m, +1h, +6h, +24h, plus max gain and max
drawdown within 24h. Mark `rugged` if liquidity or price drops > 90%. Show hit rate by rule
version and by score band.

## 8. Database (Supabase, `packages/db/migrations`)
Every table has a `chain` column (default `'solana'`) so other chains can be added later;
token identity = `(chain, address)`.

- `profiles` (user_id PK → auth.users, display_name, timezone, email_prefs jsonb)
- `tokens` (chain, address, name, symbol, image, decimals, supply, token_program, created_at,
  creator, launchpad, bonding_curve, migrated, pool_address, dex, socials jsonb)
- `token_contract_snapshots` (token, captured_at, mint_authority, freeze_authority, top10_pct,
  dev_hold_pct, lp_status, raw jsonb)
- `trades` (signature PK, slot, ts, chain, mint, wallet, side, sol_amount, token_amount,
  price_usd, mc_usd) — **only for watched tokens**; retention 30 days
- `wallets`, `wallet_stats_daily`, `wallet_lists` (seed/allow/deny, user_id)
- `rules` (version, json, active, created_at)
- `signals` (id, token, ts, score, rule_version, features jsonb, contract_snapshot_id, reasons text[])
- `signal_outcomes` (signal_id, horizon, price, mc, pct_change, max_gain, max_drawdown, rugged)
- `funnel_daily` (date, chain, seen, gate1, gate2, gate3, signaled)
- `journal_entries` (see §11)
- `watchlist` (user_id, token)
- `email_log`, `feed_gaps`, `api_usage_daily`

RLS:
- user-owned tables (`profiles`, `journal_entries`, `watchlist`, `wallet_lists`, `email_log`):
  `user_id = auth.uid()`
- market tables (`tokens`, `signals`, `signal_outcomes`, `wallets`, …): read for
  authenticated users; write only with the service role (worker)

Indexes on `(chain, mint, ts)`, `signals(ts desc)`, `signals(date in user tz)` via a
generated column or view.

## 9. Auth
- Supabase Auth, email + password. Sign-up disabled by default (`ALLOW_SIGNUP=false`);
  the user's account is created once.
- Configure Resend as Supabase Auth SMTP.
- Pages: login, forgot/reset password. Middleware protects all app routes.

## 10. Email (Resend + React Email)
- **Instant alert** when score ≥ `instant_threshold` (user setting, default 80).
  Subject: `[MemeRadar 87] $TICKER · MC $240K · 42 buyers/5m`.
  Body: contract address in monospace (easy to copy), score, top 3 reasons, Gate 2/3 results,
  contract summary, buttons: Open in Axiom / Dashboard / Solscan.
- **Throttle:** max `emails_per_hour` (default 6); overflow goes into the digest.
- **Daily digest** at 23:55 user time: every coin suggested that day with score, MC at
  signal, current outcome, day hit rate, funnel numbers.
- **Weekly summary** on Sunday.
- **Admin alerts:** feed disconnected > 60s, PC/worker offline (detected by the web app when
  the worker heartbeat in Supabase is > 2 min old), budget at 70% / 90%.
- Queue + retries; log every send in `email_log`.

## 11. Journal
`journal_entries`: user_id, signal_id (nullable), chain, mint, entry_time, entry_price,
entry_mc, size_sol, exit_time, exit_price, exit_mc, fees_sol, pnl_sol + pnl_pct (computed),
setup_tag, followed_rules (bool), emotion (enum: calm, fomo, fear, greedy, revenge, bored),
notes, screenshot_path (Supabase Storage), created_at.

- **Log trade** button pre-fills from the selected signal/token; the user enters what they did
  on Axiom. Open trades can be closed later.
- Views: list grouped by day, P&L calendar heatmap, stats (win rate, avg win/loss, best setup,
  P&L when following vs ignoring signals, P&L by score band).

## 12. Dashboard — trading-terminal layout

Dark, dense, keyboard-friendly. Use the standard terminal layout (do not copy any specific
platform's design).

```
┌ Top bar: logo · SOL price · feed status (live / lag / gap) · provider mode · date · user ┐
├ LEFT 280px ──────────┬ CENTER ──────────────────────────────┬ RIGHT 340px ───────────────┤
│ Live signals         │ Candles 1m/5m/15m/1h (from our trades)│ CONTRACT DETAILS            │
│ (Supabase Realtime)  │ markers: signal, smart-wallet buys,   │ CA [Copy] [Axiom ↗]         │
│ score · ticker · MC  │ journal entries/exits                 │ authorities · dev · holders │
│ · age · buyers/5m    ├───────────────────────────────────────┤ curve/pool · LP            │
│ score-band colors    │ Tabs: Trades tape · Smart wallets ·   │ Score breakdown             │
│ filters              │ Holders · Score history · Gates       │ Gate 1/2/3 ✓/✗ with reasons │
│ Watchlist            │                                       │ [+ Log trade]               │
├──────────────────────┴───────────────────────────────────────┴────────────────────────────┤
│ Today: signals · hit rate +1h · best / worst · funnel · journal P&L                       │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

Pages:
1. **Terminal** (above)
2. **Signal History** — calendar day picker; every coin suggested that day with score, MC at
   signal, outcomes at +5m/+15m/+1h/+6h/+24h, rugged flag; CSV export
3. **Journal**
4. **Wallets** — leaderboard, seed list, allow/deny
5. **Rules** — edit thresholds/weights, save as a new version, compare hit rate by version
6. **Settings** — email prefs, thresholds, timezone, API usage vs. limits, feed gaps log

UI details: monospace tabular numbers; green/red always paired with ▲▼; compact numbers
($1.2M); relative ages ("4m"); skeleton loaders; responsive down to laptop width; keyboard
shortcuts (`j/k` move through signals, `c` copy CA, `a` open Axiom, `l` log trade).

## 13. Non-negotiables
- No private keys, no trade execution, no Axiom API calls.
- All thresholds configurable via `rules`; no magic numbers in code.
- Structured logs (pino); worker heartbeat row in Supabase every 30s.
- Graceful shutdown: flush Redis windows and pending inserts.
- Everything must run with `PROVIDER_MODE=replay` and no API keys, so the dashboard can be
  developed offline.

## 14. Build order
After each step: run tests, run the app, and summarize what is done and what is next.

1. Monorepo scaffold, docker-compose (worker + Redis), `.env.example`, Supabase migrations
   + RLS, auth pages
2. Provider interfaces + PumpPortalFeed + recorder + replay mode + mocks
3. Redis metrics windows + watch-set lifecycle + trades persistence + tests
4. Gate 1 + Gate 2 (Helius) + Gate 3 (Birdeye) + budget guards + tests
5. Scoring + signals + funnel stats + tests
6. Outcome tracker + tests
7. Terminal dashboard (signals, chart, contract details, gates, realtime)
8. Signal History page
9. Journal (entries, screenshots, stats, heatmap)
10. Resend emails: instant, digest, weekly, admin alerts
11. Wallet intelligence job + Wallets page
12. Rules editor + Settings page
13. HeliusWssFeed (Phase 2) behind `LaunchFeed`, with signature dedupe
