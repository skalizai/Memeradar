-- MemeRadar initial schema.
-- All timestamps are timestamptz (UTC). Day grouping in the user's timezone happens in
-- queries (see signals_on_day) rather than stored columns, so the timezone can change.
-- Every market table carries `chain` so other chains can be added later.

-- ─── Enums ──────────────────────────────────────────────────────────────────
create type public.trade_side as enum ('buy', 'sell');
create type public.wallet_list_type as enum ('seed', 'allow', 'deny');
create type public.journal_emotion as enum ('calm', 'fomo', 'fear', 'greedy', 'revenge', 'bored');
create type public.outcome_horizon as enum ('5m', '15m', '1h', '6h', '24h');

-- ─── User-owned tables ──────────────────────────────────────────────────────
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'Asia/Dubai',
  email_prefs jsonb not null default jsonb_build_object(
    'instant_threshold', 80,
    'emails_per_hour', 6,
    'instant_enabled', true,
    'digest_enabled', true,
    'weekly_enabled', true,
    'admin_enabled', true
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create a profile row automatically for the (single) user
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Tokens & contract details ──────────────────────────────────────────────
create table public.tokens (
  chain text not null default 'solana',
  address text not null,
  name text,
  symbol text,
  image text,
  decimals smallint,
  supply numeric,
  token_program text check (token_program in ('spl', 'token2022')),
  token_extensions text[] not null default '{}',
  created_at timestamptz not null default now(),
  creator text,
  launchpad text not null default 'unknown',
  bonding_curve text,
  migrated boolean not null default false,
  migrated_at timestamptz,
  pool_address text,
  dex text,
  socials jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  primary key (chain, address)
);

create index tokens_created_at_idx on public.tokens (created_at desc);
create index tokens_symbol_idx on public.tokens (lower(symbol));

create table public.token_contract_snapshots (
  id bigint generated always as identity primary key,
  chain text not null default 'solana',
  token text not null,
  captured_at timestamptz not null default now(),
  mint_authority text,
  freeze_authority text,
  top10_pct numeric,
  dev_hold_pct numeric,
  curve_progress_pct numeric,
  liquidity_usd numeric,
  lp_status text,
  raw jsonb not null default '{}'::jsonb,
  foreign key (chain, token) references public.tokens (chain, address) on delete cascade
);

create index token_contract_snapshots_token_idx
  on public.token_contract_snapshots (chain, token, captured_at desc);

-- ─── Trades (watched tokens only, 30-day retention) ─────────────────────────
create table public.trades (
  signature text not null,
  slot bigint,
  ts timestamptz not null,
  chain text not null default 'solana',
  mint text not null,
  wallet text not null,
  side public.trade_side not null,
  sol_amount numeric not null,
  token_amount numeric not null,
  price_usd numeric,
  mc_usd numeric,
  -- One transaction can touch several mints; signature alone is the dedupe key per mint
  primary key (chain, signature, mint)
);

create index trades_chain_mint_ts_idx on public.trades (chain, mint, ts);
create index trades_chain_wallet_ts_idx on public.trades (chain, wallet, ts);
create index trades_ts_idx on public.trades (ts);

-- Called by the worker daily (or schedule with pg_cron)
create function public.purge_old_trades(retention interval default interval '30 days')
returns bigint
language sql
as $$
  with deleted as (
    delete from public.trades where ts < now() - retention returning 1
  )
  select count(*) from deleted;
$$;

-- ─── Smart wallets ──────────────────────────────────────────────────────────
create table public.wallets (
  chain text not null default 'solana',
  address text not null,
  label text,
  first_seen_at timestamptz not null default now(),
  is_bot boolean not null default false,
  excluded_reason text,
  rank integer,
  rank_score numeric,
  ranked_at timestamptz,
  primary key (chain, address)
);

create index wallets_rank_idx on public.wallets (chain, rank) where rank is not null;

create table public.wallet_stats_daily (
  chain text not null default 'solana',
  wallet text not null,
  date date not null,
  window_days smallint not null,
  realized_pnl_sol numeric not null default 0,
  win_rate numeric,
  closed_trades integer not null default 0,
  median_roi numeric,
  avg_hold_sec numeric,
  trades_count integer not null default 0,
  primary key (chain, wallet, date),
  foreign key (chain, wallet) references public.wallets (chain, address) on delete cascade
);

create table public.wallet_lists (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  chain text not null default 'solana',
  address text not null,
  list_type public.wallet_list_type not null,
  label text,
  created_at timestamptz not null default now(),
  unique (user_id, chain, address, list_type)
);

-- ─── Rules (versioned) ──────────────────────────────────────────────────────
create table public.rules (
  version integer generated always as identity primary key,
  json jsonb not null,
  active boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

-- At most one active rule set
create unique index rules_one_active_idx on public.rules (active) where active;

-- ─── Signals & outcomes ─────────────────────────────────────────────────────
create table public.signals (
  id uuid primary key default gen_random_uuid(),
  chain text not null default 'solana',
  token text not null,
  ts timestamptz not null default now(),
  score numeric not null check (score between 0 and 100),
  rule_version integer not null references public.rules (version),
  features jsonb not null,
  gates jsonb not null default '[]'::jsonb,
  contract_snapshot_id bigint references public.token_contract_snapshots (id),
  reasons text[] not null default '{}',
  price_usd numeric,
  mc_usd numeric,
  emailed_at timestamptz,
  foreign key (chain, token) references public.tokens (chain, address) on delete cascade
);

create index signals_ts_idx on public.signals (ts desc);
create index signals_token_idx on public.signals (chain, token, ts desc);

create table public.signal_outcomes (
  signal_id uuid not null references public.signals (id) on delete cascade,
  horizon public.outcome_horizon not null,
  recorded_at timestamptz not null default now(),
  price numeric,
  mc numeric,
  pct_change numeric,
  max_gain numeric,
  max_drawdown numeric,
  rugged boolean not null default false,
  primary key (signal_id, horizon)
);

-- Signals whose timestamp falls on `p_day` in timezone `p_tz` (uses signals_ts_idx)
create function public.signals_on_day(p_day date, p_tz text)
returns setof public.signals
language sql
stable
as $$
  select *
  from public.signals
  where ts >= (p_day::timestamp at time zone p_tz)
    and ts < ((p_day + 1)::timestamp at time zone p_tz)
  order by ts desc;
$$;

-- ─── Funnel & operations ────────────────────────────────────────────────────
create table public.funnel_daily (
  date date not null,
  chain text not null default 'solana',
  seen integer not null default 0,
  gate1 integer not null default 0,
  gate2 integer not null default 0,
  gate3 integer not null default 0,
  signaled integer not null default 0,
  primary key (date, chain)
);

create table public.feed_gaps (
  id bigint generated always as identity primary key,
  chain text not null default 'solana',
  feed text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  reason text
);

create index feed_gaps_started_idx on public.feed_gaps (started_at desc);

create table public.api_usage_daily (
  date date not null,
  provider text not null,
  requests integer not null default 0,
  units numeric not null default 0,
  primary key (date, provider)
);

-- Single row per worker instance, updated every 30s. The web app raises an admin alert
-- when last_seen_at is more than 2 minutes old.
create table public.worker_heartbeat (
  worker_id text primary key,
  last_seen_at timestamptz not null default now(),
  provider_mode text not null,
  status jsonb not null default '{}'::jsonb
);

-- ─── Journal ────────────────────────────────────────────────────────────────
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  signal_id uuid references public.signals (id) on delete set null,
  chain text not null default 'solana',
  mint text not null,
  entry_time timestamptz not null,
  entry_price numeric not null check (entry_price > 0),
  entry_mc numeric,
  size_sol numeric not null check (size_sol > 0),
  exit_time timestamptz,
  exit_price numeric check (exit_price > 0),
  exit_mc numeric,
  fees_sol numeric not null default 0,
  pnl_sol numeric generated always as (
    case when exit_price is null then null
    else size_sol * (exit_price / entry_price - 1) - fees_sol end
  ) stored,
  pnl_pct numeric generated always as (
    case when exit_price is null then null
    else (size_sol * (exit_price / entry_price - 1) - fees_sol) / size_sol * 100 end
  ) stored,
  setup_tag text,
  followed_rules boolean,
  emotion public.journal_emotion,
  notes text,
  screenshot_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (exit_time is null or exit_time >= entry_time)
);

create index journal_entries_user_entry_idx on public.journal_entries (user_id, entry_time desc);

create table public.watchlist (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  chain text not null default 'solana',
  token text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, chain, token),
  foreign key (chain, token) references public.tokens (chain, address) on delete cascade
);

create table public.email_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  kind text not null check (kind in ('instant', 'digest', 'weekly', 'admin')),
  to_address text not null,
  subject text not null,
  signal_id uuid references public.signals (id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'throttled')),
  attempts smallint not null default 0,
  provider_message_id text,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index email_log_created_idx on public.email_log (created_at desc);

-- updated_at maintenance
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger journal_entries_updated_at before update on public.journal_entries
  for each row execute function public.set_updated_at();

-- ─── Row Level Security ─────────────────────────────────────────────────────
-- User-owned tables: the row's user_id must be the caller.
alter table public.profiles enable row level security;
alter table public.journal_entries enable row level security;
alter table public.watchlist enable row level security;
alter table public.wallet_lists enable row level security;
alter table public.email_log enable row level security;

create policy "own profile" on public.profiles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own journal entries" on public.journal_entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own watchlist" on public.watchlist
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own wallet lists" on public.wallet_lists
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Emails are written by the worker (service role); the user may only read theirs
create policy "read own email log" on public.email_log
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Market tables: readable by signed-in users; writes only via the service role
-- (which bypasses RLS), so no insert/update/delete policies are defined.
do $$
declare
  t text;
begin
  foreach t in array array[
    'tokens', 'token_contract_snapshots', 'trades', 'wallets', 'wallet_stats_daily',
    'signals', 'signal_outcomes', 'funnel_daily', 'feed_gaps', 'api_usage_daily',
    'worker_heartbeat'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "authenticated read" on public.%I for select to authenticated using (true)',
      t
    );
  end loop;
end;
$$;

-- Rules: readable by the user; the Rules editor saves new versions as the user,
-- so allow inserts and toggling `active` for authenticated users.
alter table public.rules enable row level security;
create policy "authenticated read rules" on public.rules
  for select to authenticated using (true);
create policy "authenticated insert rules" on public.rules
  for insert to authenticated with check (true);
create policy "authenticated activate rules" on public.rules
  for update to authenticated using (true) with check (true);

-- ─── Realtime ───────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.signals;
alter publication supabase_realtime add table public.signal_outcomes;
alter publication supabase_realtime add table public.worker_heartbeat;

-- ─── Storage: private journal screenshots, one folder per user ──────────────
insert into storage.buckets (id, name, public)
values ('journal-screenshots', 'journal-screenshots', false)
on conflict (id) do nothing;

create policy "own screenshots read" on storage.objects
  for select to authenticated
  using (bucket_id = 'journal-screenshots' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "own screenshots write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'journal-screenshots' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "own screenshots delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'journal-screenshots' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ─── Seed: rule set v1 (keep in sync with packages/core/src/rules/defaults.ts) ─
insert into public.rules (json, active, notes)
values (
  '{
    "gate1": {
      "age_min_sec": 120,
      "age_max_sec": 86400,
      "mc_min_usd": 30000,
      "mc_max_usd": 1500000,
      "buyers_5m_min": 40,
      "bs_ratio_min": 1.5,
      "dev_sell_max_pct": 50,
      "clone_similarity_max": 0.85
    },
    "gate2": {
      "require_mint_authority_revoked": true,
      "require_freeze_authority_revoked": true,
      "top10_max_pct": 30,
      "dev_hold_max_pct": 5
    },
    "gate3": {
      "critical_flags": ["isHoneypot", "mutableMetadata", "transferFeeEnable", "freezeable"],
      "liq_min_usd": 15000
    },
    "score": {
      "weights": {
        "buyers_momentum": 20,
        "bs_ratio": 15,
        "volume_accel": 15,
        "smart_wallets": 20,
        "holder_distribution": 10,
        "curve_progress": 10,
        "liquidity": 10
      },
      "signal_threshold": 65,
      "cooldown_sec": 1800,
      "cooldown_override_delta": 15
    },
    "watch": {
      "metrics_interval_sec": 15,
      "idle_unwatch_sec": 1800,
      "max_watch_sec": 86400
    },
    "outcomes": {
      "rug_drop_pct": 90
    }
  }'::jsonb,
  true,
  'Initial defaults from the build spec'
);
