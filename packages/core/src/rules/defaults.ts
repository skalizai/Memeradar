import type { Rules } from "./schema";

/** Rule set v1, seeded into the `rules` table by the initial migration. Keep both in sync. */
export const DEFAULT_RULES: Rules = {
  gate1: {
    age_min_sec: 2 * 60,
    age_max_sec: 24 * 60 * 60,
    mc_min_usd: 30_000,
    mc_max_usd: 1_500_000,
    buyers_5m_min: 40,
    bs_ratio_min: 1.5,
    dev_sell_max_pct: 50,
    clone_similarity_max: 0.85,
  },
  gate2: {
    require_mint_authority_revoked: true,
    require_freeze_authority_revoked: true,
    top10_max_pct: 30,
    dev_hold_max_pct: 5,
  },
  gate3: {
    critical_flags: ["isHoneypot", "mutableMetadata", "transferFeeEnable", "freezeable"],
    liq_min_usd: 15_000,
  },
  score: {
    weights: {
      buyers_momentum: 20,
      bs_ratio: 15,
      volume_accel: 15,
      smart_wallets: 20,
      holder_distribution: 10,
      curve_progress: 10,
      liquidity: 10,
    },
    signal_threshold: 65,
    cooldown_sec: 30 * 60,
    cooldown_override_delta: 15,
  },
  watch: {
    metrics_interval_sec: 15,
    idle_unwatch_sec: 30 * 60,
    max_watch_sec: 24 * 60 * 60,
  },
  outcomes: {
    rug_drop_pct: 90,
  },
};
