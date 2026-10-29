import type { SupabaseClient } from "@supabase/supabase-js";
import { TABLES } from "@memeradar/db";
import type { Logger } from "./logger";
import type { WorkerStatus } from "./status";

export const HEARTBEAT_INTERVAL_MS = 30_000;

/** Upserts the worker_heartbeat row every 30s so the web app can detect an offline PC. */
export function startHeartbeat(
  supabase: SupabaseClient,
  workerId: string,
  status: WorkerStatus,
  log: Logger,
): () => void {
  const beat = async () => {
    const { error } = await supabase.from(TABLES.workerHeartbeat).upsert({
      worker_id: workerId,
      last_seen_at: new Date().toISOString(),
      provider_mode: status.providerMode,
      status: status.snapshot(),
    });
    if (error) log.warn({ err: error.message }, "heartbeat failed");
  };

  void beat();
  const timer = setInterval(beat, HEARTBEAT_INTERVAL_MS);
  return () => clearInterval(timer);
}
