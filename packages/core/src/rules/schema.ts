import { z } from "zod";

/**
 * All thresholds and weights live in the `rules` table as versioned JSON.
 * Code must read every number from here — no magic numbers.
 */
export const rulesSchema = z.object({
  gate1: z.object({
    age_min_sec: z.number().nonnegative(),
    age_max_sec: z.number().positive(),
    mc_min_usd: z.number().nonnegative(),
    mc_max_usd: z.number().positive(),
    buyers_5m_min: z.number().int().nonnegative(),
    bs_ratio_min: z.number().nonnegative(),
    dev_sell_max_pct: z.number().min(0).max(100),
    clone_similarity_max: z.number().min(0).max(1),
  }),
  gate2: z.object({
    require_mint_authority_revoked: z.boolean(),
    require_freeze_authority_revoked: z.boolean(),
    top10_max_pct: z.number().min(0).max(100),
    dev_hold_max_pct: z.number().min(0).max(100),
  }),
  gate3: z.object({
    critical_flags: z.array(z.string()),
    liq_min_usd: z.number().nonnegative(),
  }),
  score: z.object({
    weights: z.object({
      buyers_momentum: z.number().nonnegative(),
      bs_ratio: z.number().nonnegative(),
      volume_accel: z.number().nonnegative(),
      smart_wallets: z.number().nonnegative(),
      holder_distribution: z.number().nonnegative(),
      curve_progress: z.number().nonnegative(),
      liquidity: z.number().nonnegative(),
    }),
    signal_threshold: z.number().min(0).max(100),
    cooldown_sec: z.number().nonnegative(),
    cooldown_override_delta: z.number().nonnegative(),
  }),
  watch: z.object({
    metrics_interval_sec: z.number().positive(),
    idle_unwatch_sec: z.number().positive(),
    max_watch_sec: z.number().positive(),
  }),
  outcomes: z.object({
    rug_drop_pct: z.number().min(0).max(100),
  }),
});

export type Rules = z.infer<typeof rulesSchema>;
