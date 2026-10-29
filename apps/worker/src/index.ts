import { hostname } from "node:os";
import { createClient } from "@supabase/supabase-js";
import { Redis } from "ioredis";
import { parseWorkerEnv } from "@memeradar/core";
import { startHealthServer } from "./health";
import { startHeartbeat } from "./heartbeat";
import { createLogger } from "./logger";
import { WorkerStatus } from "./status";

const env = parseWorkerEnv(process.env);
const log = createLogger(env.LOG_LEVEL);
const status = new WorkerStatus(env.PROVIDER_MODE);

const redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 3 });
redis.on("error", (err) => log.error({ err: err.message }, "redis error"));

async function main() {
  log.info({ mode: env.PROVIDER_MODE }, "starting worker");

  try {
    await redis.connect();
  } catch {
    throw new Error(
      `Cannot reach Redis at ${env.REDIS_URL}. Start it with \`docker compose up -d redis\`.`,
    );
  }
  log.info("redis connected");

  const health = await startHealthServer(status, env.HEALTH_HOST, env.HEALTH_PORT);
  log.info({ host: env.HEALTH_HOST, port: env.HEALTH_PORT }, "health endpoint listening");

  let stopHeartbeat = () => {};
  if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    stopHeartbeat = startHeartbeat(supabase, `worker@${hostname()}`, status, log);
  } else {
    log.warn("Supabase not configured; heartbeat and persistence disabled");
  }

  // Feeds, metrics and the gate pipeline are attached here in later build steps.
  status.feed = env.PROVIDER_MODE === "replay" ? "replaying" : "connecting";

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info({ signal }, "shutting down");
    stopHeartbeat();
    // Later steps flush Redis metric windows and pending inserts here before exit.
    await new Promise<void>((resolve) => health.close(() => resolve()));
    await redis.quit();
    log.info("shutdown complete");
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  log.fatal({ err }, "worker failed to start");
  process.exit(1);
});
