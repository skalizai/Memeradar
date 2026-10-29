import { DEFAULT_AXIOM_URL_PATTERN } from "@memeradar/core";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const axiomUrlPattern =
  process.env.NEXT_PUBLIC_AXIOM_URL_PATTERN || DEFAULT_AXIOM_URL_PATTERN;

/** Server-only: self sign-up is off unless explicitly enabled. */
export function isSignupAllowed(): boolean {
  return process.env.ALLOW_SIGNUP === "true";
}
