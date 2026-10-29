const UNITS = [
  { value: 1e12, suffix: "T" },
  { value: 1e9, suffix: "B" },
  { value: 1e6, suffix: "M" },
  { value: 1e3, suffix: "K" },
] as const;

/** 1_234_567 → "1.2M"; 950 → "950". */
export function compactNumber(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "–";
  const abs = Math.abs(n);
  for (const { value, suffix } of UNITS) {
    if (abs >= value) {
      const scaled = (n / value).toFixed(digits).replace(/\.0+$/, "");
      return `${scaled}${suffix}`;
    }
  }
  return abs >= 100 || Number.isInteger(n) ? Math.round(n).toString() : n.toFixed(digits);
}

export function compactUsd(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "–";
  return `${n < 0 ? "-" : ""}$${compactNumber(Math.abs(n), digits)}`;
}

/** Elapsed time as "45s", "4m", "3h", "2d". */
export function relativeAge(fromIso: string, now: Date = new Date()): string {
  const sec = Math.max(0, Math.floor((now.getTime() - new Date(fromIso).getTime()) / 1000));
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

/** Green/red must always be paired with an arrow so it reads without colour. */
export function signedPct(
  pct: number,
  digits = 1,
): { text: string; direction: "up" | "down" | "flat" } {
  if (!Number.isFinite(pct)) return { text: "–", direction: "flat" };
  if (pct > 0) return { text: `▲ ${pct.toFixed(digits)}%`, direction: "up" };
  if (pct < 0) return { text: `▼ ${Math.abs(pct).toFixed(digits)}%`, direction: "down" };
  return { text: `${(0).toFixed(digits)}%`, direction: "flat" };
}

export function shortAddress(address: string, chars = 4): string {
  return address.length <= chars * 2 + 1
    ? address
    : `${address.slice(0, chars)}…${address.slice(-chars)}`;
}
