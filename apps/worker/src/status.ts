import type { ProviderMode } from "@memeradar/core";

export type FeedState = "connecting" | "live" | "lagging" | "disconnected" | "replaying";

/** Live worker status, served on GET /health and mirrored into the Supabase heartbeat. */
export class WorkerStatus {
  readonly startedAt = new Date();
  feed: FeedState = "connecting";
  lastEventAt: Date | null = null;
  watchedTokens = 0;
  credits = { helius: 0, birdeye: 0 };

  constructor(readonly providerMode: ProviderMode) {}

  recordEvent(at: Date = new Date()) {
    this.lastEventAt = at;
  }

  /** Seconds since the last feed event, or null if none has arrived yet. */
  streamLagSec(now: Date = new Date()): number | null {
    return this.lastEventAt ? (now.getTime() - this.lastEventAt.getTime()) / 1000 : null;
  }

  snapshot(now: Date = new Date()) {
    return {
      status: this.feed === "disconnected" ? "degraded" : "ok",
      providerMode: this.providerMode,
      feed: this.feed,
      streamLagSec: this.streamLagSec(now),
      lastEventAt: this.lastEventAt?.toISOString() ?? null,
      watchedTokens: this.watchedTokens,
      creditsUsedToday: { ...this.credits },
      uptimeSec: Math.round((now.getTime() - this.startedAt.getTime()) / 1000),
    };
  }
}
