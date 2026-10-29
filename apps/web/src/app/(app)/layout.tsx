import { signOut } from "@/app/(auth)/actions";
import { NavLinks } from "@/components/nav-links";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-11 shrink-0 items-center gap-4 border-b border-border bg-panel px-3">
        <div className="flex items-center gap-2">
          <span aria-hidden className="inline-block size-2 rounded-full bg-up" />
          <span className="font-mono text-xs font-semibold tracking-wider">MEMERADAR</span>
        </div>
        <NavLinks />
        <div className="ml-auto flex items-center gap-3 text-xs text-muted">
          {/* SOL price, feed status and provider mode are added with the terminal (step 7) */}
          <span className="truncate">{user?.email}</span>
          <form action={signOut}>
            <button type="submit" className="hover:text-foreground">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
