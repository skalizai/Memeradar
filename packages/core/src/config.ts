import { z } from "zod";

export const PROVIDER_MODES = ["free", "live", "replay"] as const;
export type ProviderMode = (typeof PROVIDER_MODES)[number];

const num = (fallback: number) => z.coerce.number().finite().default(fallback);

/**
 * Worker environment. In `replay` mode no API keys are required, so the
 * dashboard can be developed fully offline.
 */
export const workerEnvSchema = z
  .object({
    PROVIDER_MODE: z.enum(PROVIDER_MODES).default("replay"),
    REPLAY_SPEED: num(5).pipe(z.number().min(1).max(20)),
    REPLAY_FILES: z.string().default("*.jsonl"),
    FIXTURES_DIR: z.string().default("./fixtures"),
    FIXTURES_RETENTION_DAYS: num(14),

    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    DEFAULT_TIMEZONE: z.string().default("Asia/Dubai"),

    REDIS_URL: z.string().default("redis://localhost:6379"),
    HEALTH_HOST: z.string().default("127.0.0.1"),
    HEALTH_PORT: num(8787),
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),

    PUMPPORTAL_WS_URL: z.string().url().default("wss://pumpportal.fun/api/data"),

    HELIUS_API_KEY: z.string().optional(),
    HELIUS_RPC_URL: z.string().url().default("https://mainnet.helius-rpc.com"),
    HELIUS_MAX_RPS: num(8),
    HELIUS_MONTHLY_CREDITS: num(1_000_000),

    BIRDEYE_API_KEY: z.string().optional(),
    BIRDEYE_BASE_URL: z.string().url().default("https://public-api.birdeye.so"),
    BIRDEYE_MAX_RPS: num(1),
    BIRDEYE_FREE_DAILY_GATE3_MAX: num(12),
    BIRDEYE_MONTHLY_CU: num(30_000),

    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    ALERT_EMAIL_TO: z.string().email().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.PROVIDER_MODE === "replay") return;
    for (const key of ["HELIUS_API_KEY", "BIRDEYE_API_KEY"] as const) {
      if (!env[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when PROVIDER_MODE=${env.PROVIDER_MODE}`,
        });
      }
    }
  });

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

/** Treat empty strings (common in .env files) as unset. */
export function parseWorkerEnv(source: Record<string, string | undefined>): WorkerEnv {
  const cleaned = Object.fromEntries(
    Object.entries(source).filter(([, v]) => v !== undefined && v !== ""),
  );
  return workerEnvSchema.parse(cleaned);
}
