"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "일정" },
  { href: "/artists", label: "아티스트" },
] as const;

export function HeaderTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-4">
      {TABS.map((tab) => {
        const isActive =
          tab.href === "/"
            ? pathname === "/" || pathname.startsWith("/schedule")
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="text-sm font-medium transition-colors"
            style={{
              color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
