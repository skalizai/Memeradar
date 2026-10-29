import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULES,
  axiomUrl,
  compactNumber,
  compactUsd,
  dayInTimezone,
  parseWorkerEnv,
  relativeAge,
  rulesSchema,
  shortAddress,
  signedPct,
} from "./index";

const MINT = "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr";

describe("default rules", () => {
  it("validate against the rules schema", () => {
    expect(rulesSchema.parse(DEFAULT_RULES)).toEqual(DEFAULT_RULES);
  });

  it("score weights sum to 100", () => {
    const total = Object.values(DEFAULT_RULES.score.weights).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });
});

describe("parseWorkerEnv", () => {
  it("runs in replay mode with no API keys", () => {
    const env = parseWorkerEnv({});
    expect(env.PROVIDER_MODE).toBe("replay");
    expect(env.HELIUS_API_KEY).toBeUndefined();
  });

  it("treats empty strings as unset", () => {
    const env = parseWorkerEnv({ HELIUS_API_KEY: "", HEALTH_PORT: "9000" });
    expect(env.HELIUS_API_KEY).toBeUndefined();
    expect(env.HEALTH_PORT).toBe(9000);
  });

  it("requires API keys outside replay mode", () => {
    expect(() => parseWorkerEnv({ PROVIDER_MODE: "free" })).toThrow(/HELIUS_API_KEY/);
    expect(() =>
      parseWorkerEnv({ PROVIDER_MODE: "live", HELIUS_API_KEY: "h", BIRDEYE_API_KEY: "b" }),
    ).not.toThrow();
  });

  it("rejects replay speeds outside 1–20x", () => {
    expect(() => parseWorkerEnv({ REPLAY_SPEED: "50" })).toThrow();
  });
});

describe("links", () => {
  it("builds the default Axiom link", () => {
    expect(axiomUrl(MINT)).toBe(`https://axiom.trade/meme/${MINT}`);
  });

  it("supports a custom Axiom URL pattern", () => {
    expect(axiomUrl(MINT, "https://example.com/t/{mint}?ref=mr")).toBe(
      `https://example.com/t/${MINT}?ref=mr`,
    );
  });
});

describe("format", () => {
  it("compacts numbers", () => {
    expect(compactNumber(950)).toBe("950");
    expect(compactNumber(1_200_000)).toBe("1.2M");
    expect(compactNumber(240_000)).toBe("240K");
    expect(compactUsd(1_234_567)).toBe("$1.2M");
    expect(compactUsd(-15_000)).toBe("-$15K");
  });

  it("formats relative ages", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    expect(relativeAge("2026-01-01T11:59:15Z", now)).toBe("45s");
    expect(relativeAge("2026-01-01T11:56:00Z", now)).toBe("4m");
    expect(relativeAge("2026-01-01T09:00:00Z", now)).toBe("3h");
    expect(relativeAge("2025-12-30T12:00:00Z", now)).toBe("2d");
  });

  it("pairs direction arrows with percentages", () => {
    expect(signedPct(12.34)).toEqual({ text: "▲ 12.3%", direction: "up" });
    expect(signedPct(-5)).toEqual({ text: "▼ 5.0%", direction: "down" });
    expect(signedPct(0).direction).toBe("flat");
  });

  it("shortens addresses", () => {
    expect(shortAddress(MINT)).toBe("7GCi…W2hr");
  });
});

describe("dayInTimezone", () => {
  it("groups by the user's day, not UTC", () => {
    // 21:30 UTC is already the next day in Dubai (UTC+4)
    expect(dayInTimezone("2026-03-10T21:30:00Z", "Asia/Dubai")).toBe("2026-03-11");
    expect(dayInTimezone("2026-03-10T21:30:00Z", "UTC")).toBe("2026-03-10");
  });
});
