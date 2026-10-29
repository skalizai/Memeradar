export const DEFAULT_AXIOM_URL_PATTERN = "https://axiom.trade/meme/{mint}";

/** Link-only: MemeRadar never calls or scrapes Axiom. */
export function axiomUrl(mint: string, pattern: string = DEFAULT_AXIOM_URL_PATTERN): string {
  return pattern.replaceAll("{mint}", encodeURIComponent(mint));
}

export function solscanTokenUrl(mint: string): string {
  return `https://solscan.io/token/${encodeURIComponent(mint)}`;
}

export function solscanAccountUrl(address: string): string {
  return `https://solscan.io/account/${encodeURIComponent(address)}`;
}

export function dexscreenerUrl(mint: string): string {
  return `https://dexscreener.com/solana/${encodeURIComponent(mint)}`;
}
