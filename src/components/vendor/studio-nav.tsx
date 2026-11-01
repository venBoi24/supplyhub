"use client";

import { LayoutGrid, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

const links = [
  { href: "/vendor", label: "Objects", icon: LayoutGrid, exact: true },
  { href: "/vendor/products/new", label: "New object", icon: Plus, exact: false },
  { href: "/vendor/profile", label: "Studio profile", icon: UserRound, exact: false },
];

export function StudioNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Studio workspace" className="flex flex-wrap items-center gap-1">
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href || /^\/vendor\/products\/[^/]+$/.test(pathname)
          : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
              active
                ? "bg-surface-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
            )}
          >
            <link.icon className="size-4" aria-hidden="true" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
