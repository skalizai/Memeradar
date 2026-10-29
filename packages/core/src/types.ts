/** Every market entity is keyed by (chain, address) so other chains can be added later. */
export type Chain = "solana";

export type TradeSide = "buy" | "sell";

export type Launchpad =
  | "pumpfun"
  | "pumpswap"
  | "letsbonk"
  | "raydium_launchlab"
  | "meteora_dbc"
  | "unknown";

export interface Token {
  chain: Chain;
  address: string;
  name: string | null;
  symbol: string | null;
  image: string | null;
  decimals: number | null;
  supply: string | null;
  tokenProgram: "spl" | "token2022" | null;
  createdAt: string;
  creator: string | null;
  launchpad: Launchpad;
  bondingCurve: string | null;
  migrated: boolean;
  poolAddress: string | null;
  dex: string | null;
  socials: Record<string, string>;
}

export interface Trade {
  signature: string;
  slot: number | null;
  ts: string;
  chain: Chain;
  mint: string;
  wallet: string;
  side: TradeSide;
  solAmount: number;
  tokenAmount: number;
  priceUsd: number | null;
  mcUsd: number | null;
}

export interface Migration {
  chain: Chain;
  mint: string;
  signature: string;
  ts: string;
  poolAddress: string | null;
  dex: string | null;
}

export type GateId = "gate1" | "gate2" | "gate3";

export interface GateCheck {
  id: string;
  passed: boolean;
  /** Human-readable reason, shown in the dashboard and emails. */
  reason: string;
}

export interface GateResult {
  gate: GateId;
  passed: boolean;
  skipped?: string;
  checks: GateCheck[];
}

export type OutcomeHorizon = "5m" | "15m" | "1h" | "6h" | "24h";

export const OUTCOME_HORIZONS: readonly OutcomeHorizon[] = ["5m", "15m", "1h", "6h", "24h"];

export type Emotion = "calm" | "fomo" | "fear" | "greedy" | "revenge" | "bored";

export const EMOTIONS: readonly Emotion[] = ["calm", "fomo", "fear", "greedy", "revenge", "bored"];
