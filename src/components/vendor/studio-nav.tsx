"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

const tabs = [
  {
    href: "/vendor",
    labelKey: "studio.overview",
    active: (pathname: string) => pathname === "/vendor",
  },
  {
    href: "/vendor/products",
    labelKey: "studio.products",
    active: (pathname: string) => pathname.startsWith("/vendor/products"),
  },
  {
    href: "/vendor/orders",
    labelKey: "studio.orders",
    active: (pathname: string) => pathname.startsWith("/vendor/orders"),
  },
  {
    href: "/delivery-live?persona=seller",
    labelKey: "studio.deliveries",
    active: () => false,
  },
  {
    href: "/vendor/earnings",
    labelKey: "studio.earnings",
    active: (pathname: string) => pathname.startsWith("/vendor/earnings"),
  },
  {
    href: "/vendor/profile",
    labelKey: "studio.profile",
    active: (pathname: string) => pathname.startsWith("/vendor/profile"),
  },
] as const;

export function StudioNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav aria-label={t("studio.nav")} className="border-b border-border bg-surface">
      <div className="scroll-x mx-auto flex w-full max-w-[1180px] gap-0.5 px-4 sm:px-6">
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
              {t(tab.labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
