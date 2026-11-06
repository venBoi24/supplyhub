"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

const tabs = [
  {
    href: "/vendor",
    label: "Overview",
    active: (pathname: string) => pathname === "/vendor",
  },
  {
    href: "/vendor/products",
    label: "Products",
    active: (pathname: string) => pathname.startsWith("/vendor/products"),
  },
  {
    href: "/vendor/orders",
    label: "Orders",
    active: (pathname: string) => pathname.startsWith("/vendor/orders"),
  },
  {
    href: "/vendor/earnings",
    label: "Earnings",
    active: (pathname: string) => pathname.startsWith("/vendor/earnings"),
  },
  {
    href: "/vendor/profile",
    label: "Studio profile",
    active: (pathname: string) => pathname.startsWith("/vendor/profile"),
  },
] as const;

export function StudioNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Studio navigation" className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-[1180px] gap-0.5 overflow-x-auto px-4 sm:px-6">
        {tabs.map((tab) => {
          const active = tab.active(pathname);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-11 shrink-0 items-center border-b-2 px-3 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none",
                active
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
