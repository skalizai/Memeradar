import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { startHealthServer } from "./health";
import { WorkerStatus } from "./status";

describe("WorkerStatus", () => {
  it("reports stream lag since the last event", () => {
    const status = new WorkerStatus("replay");
    expect(status.streamLagSec()).toBeNull();
    status.recordEvent(new Date("2026-01-01T00:00:00Z"));
    expect(status.streamLagSec(new Date("2026-01-01T00:00:12Z"))).toBe(12);
  });

  it("is degraded while the feed is disconnected", () => {
    const status = new WorkerStatus("free");
    status.feed = "disconnected";
    expect(status.snapshot().status).toBe("degraded");
  });
});

describe("health server", () => {
  let server: Server | undefined;
  afterEach(() => new Promise<void>((r) => (server ? server.close(() => r()) : r())));

  it("serves GET /health as JSON", async () => {
    const status = new WorkerStatus("replay");
    status.feed = "replaying";
    server = await startHealthServer(status, "127.0.0.1", 0);
    const { port } = server.address() as { port: number };

    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ status: "ok", providerMode: "replay", feed: "replaying" });

    expect((await fetch(`http://127.0.0.1:${port}/nope`)).status).toBe(404);
  });
});
