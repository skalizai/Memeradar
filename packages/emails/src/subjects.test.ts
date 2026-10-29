import { describe, expect, it } from "vitest";
import { instantAlertSubject } from "./subjects";

describe("instantAlertSubject", () => {
  it("matches the spec format", () => {
    expect(instantAlertSubject({ score: 87.4, symbol: "wif", mcUsd: 240_000, buyers5m: 42 })).toBe(
      "[MemeRadar 87] $WIF · MC $240K · 42 buyers/5m",
    );
  });

  it("handles tokens without a ticker", () => {
    expect(instantAlertSubject({ score: 80, symbol: null, mcUsd: 1_500_000, buyers5m: 3 })).toContain(
      "$??? · MC $1.5M",
    );
  });
});
