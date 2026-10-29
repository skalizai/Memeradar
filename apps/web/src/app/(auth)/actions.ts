"use server";

import { redirect } from "next/navigation";
import { isSignupAllowed, isSupabaseConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; message?: string };

const MIN_PASSWORD_LENGTH = 8;
const NOT_CONFIGURED = "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };

  const email = field(formData, "email");
  const password = formData.get("password");
  if (!email || typeof password !== "string" || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Invalid email or password." };

  redirect(safeNextPath(formData.get("next")));
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSignupAllowed()) return { error: "Sign-up is disabled." };
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };

  const email = field(formData, "email");
  const password = formData.get("password");
  if (!email || typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Enter an email and a password of at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${appUrl()}/auth/confirm?next=/` },
  });
  if (error) return { error: error.message };

  return { message: "Check your email to confirm your account." };
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };

  const email = field(formData, "email");
  if (!email) return { error: "Enter your email." };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl()}/auth/confirm?next=/reset-password`,
  });

  // Same response whether or not the account exists
  return { message: "If that account exists, a reset link is on its way." };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = formData.get("password");
  const confirm = formData.get("confirm");
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Use at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (password !== confirm) return { error: "Passwords do not match." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
