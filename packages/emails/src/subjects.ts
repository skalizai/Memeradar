import { compactUsd } from "@memeradar/core";

export interface InstantAlertSubjectInput {
  score: number;
  symbol: string | null;
  mcUsd: number;
  buyers5m: number;
}

/** `[MemeRadar 87] $TICKER · MC $240K · 42 buyers/5m` */
export function instantAlertSubject({ score, symbol, mcUsd, buyers5m }: InstantAlertSubjectInput): string {
  const ticker = symbol ? `$${symbol.toUpperCase()}` : "$???";
  return `[MemeRadar ${Math.round(score)}] ${ticker} · MC ${compactUsd(mcUsd)} · ${buyers5m} buyers/5m`;
}
