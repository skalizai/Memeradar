/**
 * Table names, shared by the worker and the web app so a rename is a one-line change.
 * Full row types are generated from the linked project with `pnpm db:types`
 * (writes src/database.types.ts).
 */
export const TABLES = {
  profiles: "profiles",
  tokens: "tokens",
  tokenContractSnapshots: "token_contract_snapshots",
  trades: "trades",
  wallets: "wallets",
  walletStatsDaily: "wallet_stats_daily",
  walletLists: "wallet_lists",
  rules: "rules",
  signals: "signals",
  signalOutcomes: "signal_outcomes",
  funnelDaily: "funnel_daily",
  journalEntries: "journal_entries",
  watchlist: "watchlist",
  emailLog: "email_log",
  feedGaps: "feed_gaps",
  apiUsageDaily: "api_usage_daily",
  workerHeartbeat: "worker_heartbeat",
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];

/** Tables only the user can see (RLS: user_id = auth.uid()). */
export const USER_OWNED_TABLES: readonly TableName[] = [
  TABLES.profiles,
  TABLES.journalEntries,
  TABLES.watchlist,
  TABLES.walletLists,
  TABLES.emailLog,
];

export const JOURNAL_SCREENSHOTS_BUCKET = "journal-screenshots";
