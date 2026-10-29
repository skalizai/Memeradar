import type { ReactNode } from "react";
import { isSupabaseConfigured } from "@/lib/env";

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-lg border border-border bg-panel p-6 shadow-xl">
        <div className="mb-6 flex items-center gap-2">
          <span aria-hidden className="inline-block size-2.5 rounded-full bg-up" />
          <span className="font-mono text-sm font-semibold tracking-wider">MEMERADAR</span>
        </div>
        <h1 className="mb-5 text-lg font-semibold">{title}</h1>
        {!isSupabaseConfigured && (
          <p className="mb-4 rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
            Supabase is not configured. Copy <code>.env.example</code> to{" "}
            <code>apps/web/.env.local</code> and fill in the Supabase URL and anon key.
          </p>
        )}
        {children}
      </div>
    </main>
  );
}
