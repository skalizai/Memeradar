"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV_ITEMS = [
  { href: "/", label: "Terminal" },
  { href: "/history", label: "Signal History" },
  { href: "/journal", label: "Journal" },
  { href: "/wallets", label: "Wallets" },
  { href: "/rules", label: "Rules" },
  { href: "/settings", label: "Settings" },
] as const;

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 text-sm">
      {NAV_ITEMS.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded px-2 py-1 transition-colors ${
              active ? "bg-panel-raised text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
